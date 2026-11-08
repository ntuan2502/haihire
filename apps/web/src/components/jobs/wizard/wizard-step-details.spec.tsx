import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardStepDetails, type WizardStepDetailsProps, type Step1TouchedState } from "./wizard-step-details";

// Mock i18n
vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, _params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        "jobs.wizard.jobDetailsTitle": "Chi tiết công việc",
        "jobs.wizard.jobDetailsDesc": "Điền các thông tin cơ bản cho vị trí tuyển dụng.",
        "jobs.wizard.saveChangesLink": "Lưu thay đổi",
        "jobs.wizard.jobTitleLabel": "Tiêu đề công việc",
        "jobs.wizard.departmentLabel": "Phòng ban",
        "jobs.wizard.departmentHint": "Ví dụ: Kỹ thuật, Marketing",
        "jobs.wizard.locationLabel": "Địa điểm",
        "jobs.wizard.locationDesc": "Thành phố hoặc quốc gia làm việc",
        "jobs.wizard.locationErrorHelp": "Vui lòng nhập địa điểm",
        "jobs.wizard.postalCodeLabel": "Mã bưu điện",
        "jobs.wizard.pickLocationFirst": "Tùy chọn",
        "jobs.wizard.employmentTypeLabel": "Hình thức làm việc",
        "jobs.wizard.experienceLevelLabel": "Cấp bậc",
        "jobs.wizard.workplaceLabel": "Nơi làm việc",
        "jobs.wizard.compensationTitle": "Mức lương & Đãi ngộ",
        "jobs.wizard.compensationOptional": "Tùy chọn",
        "jobs.wizard.compensationHintClosed": "Nhấp để thiết lập khoảng lương cho vị trí này",
        "jobs.wizard.compensationHintOpen": "Mức lương minh bạch giúp thu hút nhiều ứng viên tiềm năng hơn.",
        "jobs.wizard.payNegotiableDetail": "Mức lương thỏa thuận khi phỏng vấn",
        "jobs.wizard.minSalary": "Lương tối thiểu",
        "jobs.wizard.maxSalary": "Lương tối đa",
        "jobs.wizard.currency": "Tiền tệ",
        "jobs.wizard.perPeriod": "Kỳ hạn",
        "jobs.wizard.descriptionTitle": "Mô tả công việc",
        "jobs.wizard.descriptionHelpText": "Tóm tắt trách nhiệm chính và mục tiêu của vai trò này",
        "jobs.wizard.charsCount": "ký tự",
        "jobs.wizard.requirementsTitle": "Yêu cầu ứng viên",
        "jobs.wizard.requirementsNotice": "Liệt kê kỹ năng chuyên môn, kinh nghiệm cần thiết",
        "jobs.wizard.continueToPublish": "Tiếp tục sang bước xuất bản",
        "jobs.wizard.errors.titleRequired": "Tiêu đề công việc không được để trống",
        "jobs.wizard.errors.descRequired": "Mô tả công việc không được để trống",
        "jobs.wizard.employmentTypeError": "Vui lòng chọn hình thức làm việc",
        "jobs.wizard.experienceLevelError": "Vui lòng chọn cấp bậc",
        "jobs.wizard.workplaceError": "Vui lòng chọn nơi làm việc",
        "jobs.wizard.currencyError": "Vui lòng chọn loại tiền tệ",
        "jobs.wizard.salaryPerError": "Vui lòng chọn kỳ hạn lương",
        "common.cancel": "Hủy bỏ",
        "common.required": "Bắt buộc",
        "common.optional": "Tùy chọn",
      };
      return translations[key] || key;
    },
  }),
}));

describe("WizardStepDetails Component Tests", () => {
  const defaultTouched: Step1TouchedState = {
    title: false,
    location: false,
    description: false,
    employmentType: false,
    experienceLevel: false,
    workplace: false,
    currency: false,
    salaryPer: false,
  };

  const createProps = (overrides: Partial<WizardStepDetailsProps> = {}): WizardStepDetailsProps => ({
    jobTitle: "",
    setJobTitle: vi.fn(),
    department: "",
    setDepartment: vi.fn(),
    location: "",
    setLocation: vi.fn(),
    postalCode: "",
    setPostalCode: vi.fn(),
    employmentType: "",
    setEmploymentType: vi.fn(),
    experienceLevel: "",
    setExperienceLevel: vi.fn(),
    workplace: "",
    setWorkplace: vi.fn(),
    compensationOpen: false,
    setCompensationOpen: vi.fn(),
    payNegotiable: false,
    setPayNegotiable: vi.fn(),
    minSalary: "",
    setMinSalary: vi.fn(),
    maxSalary: "",
    setMaxSalary: vi.fn(),
    currency: "",
    setCurrency: vi.fn(),
    salaryPer: "",
    setSalaryPer: vi.fn(),
    description: "",
    setDescription: vi.fn(),
    requirements: "",
    setRequirements: vi.fn(),
    touched: defaultTouched,
    setTouched: vi.fn(),
    showTitleError: false,
    showLocationError: false,
    showEmploymentTypeError: false,
    showExperienceLevelError: false,
    showWorkplaceError: false,
    hasSalaryData: false,
    showCurrencyError: false,
    showSalaryPerError: false,
    showDescriptionError: false,
    isDescriptionValid: false,
    isStep1Valid: false,
    onContinue: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  });

  it("renders form fields correctly with labels", () => {
    const props = createProps();
    render(<WizardStepDetails {...props} />);

    expect(screen.getByText("Tiêu đề công việc")).toBeInTheDocument();
    expect(screen.getByText("Phòng ban")).toBeInTheDocument();
    expect(screen.getByText("Địa điểm")).toBeInTheDocument();
    expect(screen.getByText("Mô tả công việc")).toBeInTheDocument();
    expect(screen.getByText("Yêu cầu ứng viên")).toBeInTheDocument();
  });

  it("displays validation error when showTitleError is true", () => {
    const props = createProps({ showTitleError: true });
    render(<WizardStepDetails {...props} />);

    expect(screen.getByText("Tiêu đề công việc không được để trống")).toBeInTheDocument();
  });

  it("displays validation error when showDescriptionError is true", () => {
    const props = createProps({ showDescriptionError: true });
    render(<WizardStepDetails {...props} />);

    expect(screen.getByText("Mô tả công việc không được để trống")).toBeInTheDocument();
  });

  it("toggles compensation accordion when clicked", () => {
    const setCompensationOpen = vi.fn();
    const props = createProps({ compensationOpen: false, setCompensationOpen });
    render(<WizardStepDetails {...props} />);

    const accordionBtn = screen.getByText("Mức lương & Đãi ngộ");
    fireEvent.click(accordionBtn);

    expect(setCompensationOpen).toHaveBeenCalledWith(true);
  });

  it("renders salary inputs when compensation accordion is open and not negotiable", () => {
    const props = createProps({
      compensationOpen: true,
      payNegotiable: false,
    });
    render(<WizardStepDetails {...props} />);

    expect(screen.getByText("Lương tối thiểu")).toBeInTheDocument();
    expect(screen.getByText("Lương tối đa")).toBeInTheDocument();
  });

  it("calls onContinue when continue button is clicked and form is valid", () => {
    const onContinue = vi.fn();
    const props = createProps({ isStep1Valid: true, onContinue });
    render(<WizardStepDetails {...props} />);

    const continueBtn = screen.getByText("Tiếp tục sang bước xuất bản");
    expect(continueBtn).not.toBeDisabled();
    fireEvent.click(continueBtn);

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("disables continue button when form is invalid", () => {
    const props = createProps({ isStep1Valid: false });
    render(<WizardStepDetails {...props} />);

    const continueBtn = screen.getByText("Tiếp tục sang bước xuất bản");
    expect(continueBtn).toBeDisabled();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    const props = createProps({ onCancel });
    render(<WizardStepDetails {...props} />);

    const cancelBtn = screen.getByText("Hủy bỏ");
    fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
